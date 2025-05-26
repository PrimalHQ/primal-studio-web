import { createStore } from "solid-js/store";
import { logWarning } from "src/utils/logger";

export const [linkPreviews, setLinkPreviews] = createStore<Record<string, any>>({});

export const getLinkPreview = (url: string) => {
  return { ...linkPreviews[url] };
};

export const addLinkPreviews = async (url: string) => {
  if (linkPreviews[url]) {
    return { ...linkPreviews[url] };
  }

  try {
    const origin = window.location.origin.startsWith('http://localhost') ? 'https://dev.primal.net' : window.location.origin;

    const preview = await fetch(`${origin}/link-preview?u=${encodeURIComponent(url)}`);
    const data = await preview.json();

    return { url, description: data.description, title: data.title, images: [data.image], favicons: [data.icon_url] };

  } catch (e) {
    logWarning('Failed to get preview for: ', url);
    return { url };
  }
};

export const parseLinkPreviews = (previewKindContent: any) => {
  if (previewKindContent.resources.length === 0) return;

  for (let i = 0; i < previewKindContent.resources.length; i++) {
    const data = previewKindContent.resources[i];

    if (!data) {
      continue;
    }

    const preview = {
      url: data.url,
      title: data.md_title,
      description: data.md_description,
      mediaType: data.mimetype,
      contentType: data.mimetype,
      images: [data.md_image],
      favicons: [data.icon_url],
    };

    setLinkPreviews(() => ({ [data.url]: preview }));
  }
}
