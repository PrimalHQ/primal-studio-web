import { BlobDescriptor, BlossomClient, encodeAuthorizationHeader, fetchWithTimeout, SignedEvent } from "blossom-client-sdk";
import { createStore } from "solid-js/store";
import { logInfo, logWarning } from "./logger";
import { accountStore, primalBlossom } from "src/stores/AccountStore";
import { v4 as uuidv4 } from 'uuid';
import { MB } from "src/constants";
import { signEvent } from "./nostrApi";
import { sha256 } from "./ui";
import { utils } from 'src/utils/nTools';
import { batch } from "solid-js";

export const uploadLimit = {
  regular: 100,
  premium: 1024,
  premiumLegend: 10 * 1024,
}

export type UploadCallbacks = {
  onFail?: (reason: string, uploadId?: string) => void,
  onRefuse?: (reason: string, uploadId?: string) => void,
  onCancel?: (uploadId?: string) => void,
  onSuccsess?: (blob: BlobDescriptor, uploadId?: string) => void,
  onStart?: (uploadId: string | undefined, cancelUpload: () => void) => void,
};

export type UploadState = {
  isUploading: boolean,
  progress: number,
  id?: string,
  uploadLimit: number,
  file?: File,
  sha256?: string,
  xhr?: XMLHttpRequest,
  auth?: SignedEvent,
  callbacks?: UploadCallbacks
}

export type UploadStore = {
  uploads: Record<string, UploadState>,
  uploadOrder: string[],
};

export const emptyUploadStore = (): UploadStore => ({
  uploads: {},
  uploadOrder: [],
});

export const newUploadState = (file: File): UploadState => ({
    isUploading: true,
    id: uuidv4(),
    progress: 0,
    xhr: new XMLHttpRequest(),
    file,
    uploadLimit: uploadLimit.regular,
});

export const [uploadStore, setUploadStore] = createStore<UploadStore>({ ...emptyUploadStore() });

export const calcUploadLimit = (membershipTier: string | undefined, size: number) => {
  let limit = uploadLimit.regular;

  if (membershipTier === 'premium') {
    limit = uploadLimit.premium;
  }

  if (membershipTier === 'premium-legend') {
    limit = uploadLimit.premiumLegend;
  }

  return limit;
};

export const uploadFile = async (
  file: File,
  callbacks?: UploadCallbacks,
) => {
  const url = utils.normalizeURL(accountStore.blossomServers[0] || primalBlossom);

  let uploadState = newUploadState(file);

  uploadState.callbacks = callbacks;

  let allow = true;

  if (url === primalBlossom) {
    uploadState.uploadLimit = calcUploadLimit(accountStore.membershipStatus.tier, file.size);
    allow = file.size <= MB * uploadState.uploadLimit;
  }

  if (!allow) {
    callbacks?.onRefuse && callbacks.onRefuse(`file_too_big_${uploadState.uploadLimit}`)
    return;
  }

  const xhr = uploadState.xhr;
  if (!xhr) return;

  try {
    const auth = await BlossomClient.createUploadAuth(signEvent, file, { message: 'media upload' });
    const fileSha = await sha256(file);

    uploadState.auth = auth;
    uploadState.sha256 = fileSha;

    batch(() => {
      setUploadStore('uploads', () => ({ [uploadState.id || 'unklnown']: { ...uploadState } }));
      setUploadStore('uploadOrder', uploadStore.uploadOrder.length, () => uploadState.id || 'unknown');
    });

    const encodedAuthHeader = encodeAuthorizationHeader(auth);

    const mediaUrl = `${url}media`;
    const uploadUrl = `${url}upload`;

    let headers = {
      "X-SHA-256": fileSha,
      "Authorization": encodedAuthHeader,
      'Content-Type': file.type,
    }

    let checkHeaders: Record<string, string> = {
      ...headers,
      "X-Content-Length": `${file.size}`,
    };

    if (file.type) checkHeaders["X-Content-Type"] = file.type;

    try {
      const mediaCheck = await fetchWithTimeout(mediaUrl, {
        method: "HEAD",
        headers: checkHeaders,
        timeout: 3_000,
      });

      if (mediaCheck.status === 200) {
        sendFile(
          file,
          uploadState.id!,
          xhr,
          mediaUrl,
          headers,
          callbacks,
        );
        return;
      }

    } catch (e) {
      logWarning('Failed media upload check: ', e);
    }

    try {
      const uploadCheck = await fetchWithTimeout(uploadUrl, {
        method: "HEAD",
        headers: checkHeaders,
        timeout: 3_000,
      });

      if (uploadCheck.status === 200) {
        sendFile(
          file,
          uploadState.id!,
          xhr,
          uploadUrl,
          headers,
          callbacks,
        );
        return;
      }
    } catch (e) {
      logWarning('Failed media upload check: ', e);
    }

    // toaster?.sendWarning(`Failed to upload to ${url}`);
    removeUpload(uploadState.id!);
    callbacks?.onFail && callbacks.onFail(`Failed to upload to ${url}`);
  } catch (e) {
    removeUpload(uploadState.id!);
    callbacks?.onCancel && callbacks.onCancel();
  }
}

export const sendFile = (
  file: File,
  uploadStateId: string,
  xhr: XMLHttpRequest,
  uploadUrl: string,
  headers: Record<string, string>,
  callbacks?: UploadCallbacks,
) => {
  xhr.open('PUT', uploadUrl, true);

  const headerNames = Object.keys(headers);

  for (let i = 0; i < headerNames.length; i++) {
    const name = headerNames[i];
    xhr.setRequestHeader(name, headers[name]);
  }

  const xhrOnProgress = (e: ProgressEvent) => {
    if (e.lengthComputable) {
      const p = Math.ceil(e.loaded / e.total * 100);

      setUploadStore(
        'uploads',
        uploadStateId,
        'progress',
        () => p,
      );
    }
  }

  const xhrOnLoad = (e: ProgressEvent) => {
    if ((xhr.status || 200) < 300) {
      const response = JSON.parse(xhr.responseText || '{}');

      callbacks?.onSuccsess && callbacks.onSuccsess(response, uploadStateId);

      mirrorUpload(response);
      removeUpload(uploadStateId);
      return;
    }
    removeUpload(uploadStateId);
  }

  const xhrOnError = (e: ProgressEvent) => {
    removeUpload(uploadStateId);
    callbacks?.onFail && callbacks.onFail('', uploadStateId);
  }

  const xhrOnAbort = (e: ProgressEvent) => {
    logInfo('upload aborted: ', file.name);
    clearXHR();
    removeUpload(uploadStateId);
  }

  const clearXHR = () => {
    xhr.removeEventListener("load", xhrOnLoad);
    xhr.removeEventListener("error", xhrOnError);
    xhr.removeEventListener("abort", xhrOnAbort);

    setUploadStore(
      'uploads',
      uploadStateId,
      'xhr', () => undefined,
    );
  }

  xhr.upload.addEventListener("progress", xhrOnProgress);
  xhr.addEventListener("load", xhrOnLoad);
  xhr.addEventListener("error", xhrOnError);
  xhr.addEventListener("abort", xhrOnAbort);

  xhr.send(file);

  callbacks?.onStart && callbacks.onStart(uploadStateId, () => {
    xhr.abort();
    removeUpload(uploadStateId);
  });
}

export const removeUpload = (id: string) => {
  batch(() => {
    setUploadStore('uploads', () => ({ [id]: undefined }));
    setUploadStore('uploadOrder', (ups) => ups.filter(u => u !== id));
  });
};

export const cancelUpload = (id: string) => {
  const upload = uploadStore.uploads[id];

  if (!upload) return;

  upload.xhr?.abort();
  upload.callbacks?.onCancel && upload.callbacks.onCancel(upload.id);

  removeUpload(id);
}

export const mirrorUpload = async (blob: BlobDescriptor) => {
  const mirrors = accountStore.blossomServers.slice(1) || [];
  if (mirrors.length === 0) return;

  let auth = await BlossomClient.createUploadAuth(signEvent, blob.sha256, { message: 'media upload mirroring'});

  for (let server of mirrors) {
    try {
      BlossomClient.mirrorBlob(server, blob, { auth });
    } catch {
      logWarning('Failed to mirror to: ', server)
    }
  }
};
