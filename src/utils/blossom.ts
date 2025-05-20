import { fetchWithTimeout } from "blossom-client-sdk";

export const checkBlossomServer = async (url: string) => {
  // const encodedAuthHeader = encodeAuthorizationHeader(auth);
  // const uploadUrl = url.endsWith('/') ? `${url}upload` : `${url}`;

  const blossomCheck = await fetchWithTimeout(url, {
    method: "GET",
    timeout: 3_000,
  });

  return blossomCheck.status === 200;
}

export const areUrlsSame = (a: string, b: string) => {
  if (a === b) return true;

  let trimA = a;
  let trimB = b;


  if (a.endsWith('/')) trimA = a.slice(0, -1);
  if (b.endsWith('/')) trimB = b.slice(0, -1);

  return trimA === trimB;
}
