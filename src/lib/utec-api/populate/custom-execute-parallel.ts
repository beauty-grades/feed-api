import { ExecuteParallel2NExtremes } from "../../../lib/utils/execute-parallel/2n-extremes"
import { ExecuteParallelN } from "../../../lib/utils/execute-parallel/n"

/**
 * Executes a given callback function on an array of data in parallel, dividing the array into smaller arrays
 * of size `n` and executing the callback function on each smaller array in parallel.
 * @param n The number of parallel requests to make at once (default: 2)
 * @param array The array of data to be processed
 * @param callback The callback function to execute on each item in the array
 */
export const CustomExecuteParallel = async (
  array: any[],
  callback: (id: any) => Promise<any>
) => {
  const to_execute_sequentially = array.slice(-3).reverse()

  const to_execute_simultaneously = array.slice(0, -3)

  await Promise.all([
    ExecuteParallelN(1, to_execute_sequentially, callback),
    ExecuteParallel2NExtremes(1, to_execute_simultaneously, callback),
  ])
}
