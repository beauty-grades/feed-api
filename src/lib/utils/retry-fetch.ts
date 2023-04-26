const MAX_RETRIES = 10;
const RETRY_INTERVAL = 1;

export async function retryFetch(url: string, options: RequestInit = {}, retries = 0): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (response.ok) {
      return response;
    }
  } catch (error) {
    console.error(`Failed to fetch in attemp ${retries}`);
  }

  if (retries < MAX_RETRIES) {
    console.log(`Retrying fetch ${url} in ${RETRY_INTERVAL}ms`);
    await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
    return retryFetch(url, options, retries + 1);
  } else {
    throw new Error(`Failed to fetch ${url} after ${MAX_RETRIES} retries`);
  }
}