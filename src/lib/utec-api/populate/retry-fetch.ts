const MAX_RETRIES = 10
const RETRY_INTERVAL = 1

export async function retryFetch(
  url: string,
  options: RequestInit = {},
  retries = 0
): Promise<Response> {
  try {
    console.log("starting", options.body)
    const response = await fetch(url, options)
    if (response.ok) {
      console.log("ending", options.body)
      return response
    }
    console.log(":(", options.body)
  } catch (error) {
    console.error(`Failed to fetch in attemp ${retries}`, options.body)
  }

  if (retries < MAX_RETRIES) {
    console.log(`Retrying fetch in ${RETRY_INTERVAL}ms`)
    await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL))
    return retryFetch(url, options, retries + 1)
  } else {
    console.error(options.body)
    throw new Error(`Failed to fetch after ${MAX_RETRIES} retries`)
  }
}
