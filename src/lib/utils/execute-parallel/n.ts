/**
 * Executes a given callback function on an array of data in parallel, dividing the array into smaller arrays
 * of size `n` and executing the callback function on each smaller array in parallel.
 * @param n The number of parallel requests to make at once (default: 2)
 * @param array The array of data to be processed
 * @param callback The callback function to execute on each item in the array
 * @returns - A Promise that resolves when all elements have been processed.

 */
export const ExecuteParallelN = async (
  n: number,
  array: any[],
  callback: (id: any) => Promise<any>
) => {
  let i = 0

  // Loop through the array and divide it into smaller arrays of size `n`
  while (true) {
    const to_fetch = array.slice(i * n, i * n + n)

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
