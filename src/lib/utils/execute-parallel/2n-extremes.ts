/**
 * Executes a callback function on n elements of each extreme of an array in parallel,
 * and then repeats the process with the next n elements until all elements have been processed.
 * @param n - The number of elements in each extreme to process in parallel in each iteration.
 * @param array - The array to process.
 * @param callback - The function to execute on each element of the array.
 * @returns - A Promise that resolves when all elements have been processed.
 */
export const ExecuteParallel2NExtremes = async (
  n: number,
  array: any[],
  callback: (id: any) => Promise<any>
) => {
  let i = 0
  let pending = array
  while (true) {
    let to_fetch: any[] = []

    // add the first n elements from pending to the to_fetch array
    to_fetch = pending.slice(0, n)

    // remove the first n elements from pending
    pending = pending.slice(n)

    // add the last n elements from pending to the to_fetch array
    to_fetch = to_fetch.concat(pending.slice(-n))

    // remove the last n elements from pending
    pending = pending.slice(0, -n)

    // If there are no more items left in the array, break out of the loop
    if (to_fetch.length === 0) {
      break
    }
    // If there are still items left in the array, execute the callback function on each item in the smaller array in parallel
    else {
      await Promise.all(to_fetch.map((id) => callback(id)))
      i += 1
    }
  }
}
