import { roundTo } from "../../utils/round-to"

interface RawScore {
  codCourseTypeNote: number
  numSequence: number
  weight: number
  codCourseForm: number
  name: string
  codCourseSesion: number
  score: string
  delete: boolean
  sesion: string
  code: string
}

const last_number_matcher = /(\d+)\D*$/gm
const weight_label_matcher = /(\d+)%\s(\(?[\p{L}0-9 .-_]+\)?)/gu

export const parseEvaluations = (rawScores: RawScore[], formula: string) => {
  let weights: {
    id: string
    weight: number | null
  }[] = []

  let evaluations: {
    handle: string
    label: string
    weight: number | null
    can_be_deleted: boolean
    score: number | null
  }[] = []

  let found_100 = false

  let match: RegExpExecArray | null
  while ((match = weight_label_matcher.exec(formula)) !== null) {
    const weight = roundTo(parseInt(match[1], 10) / 100, 4)
    let id = match[2].trim()

    if (weight === 1) {
      found_100 = true
    }

    if (id.includes(")")) {
      id = id.replace("(", "").replace(")", "").trim()
    }

    weights.push({
      id,
      weight,
    })
  }

  if (weights.length > 1 && found_100) {
    // remove 100% weight
    weights = weights.filter(({ weight }) => weight !== 1)

    // turn all weights weight to null
    weights = weights.map((weight) => ({ ...weight, weight: null }))

    // if handle ends in " 1", remove it
    const correct_handle = (handle: string) => {
      if (handle.endsWith(" 1")) {
        return handle.slice(0, -2)
      }
      return handle
    }

    evaluations = rawScores.map((score) => ({
      handle: correct_handle(score.code),
      label: score.name.trim(),
      weight: null,
      can_be_deleted: score.delete,
      score: ["-", "RET", "NP"].includes(score.score)
        ? null
        : parseFloat(score.score),
    }))

    return { evaluations, wrong_formula: true }
  }

  const scores_to_check = rawScores.map((score) => ({
    handle: score.code,
    label: score.name.trim(),
    weight: 0,
    can_be_deleted: score.delete,
    raw_weight: score.weight,
    score: ["-", "RET", "NP"].includes(score.score)
      ? null
      : parseFloat(score.score),
  }))

  // sort weights by lenght of id
  weights.sort((a, b) => b.id.length - a.id.length)

  for (const weight of weights) {
    let matching_scores = scores_to_check.filter(({ handle }) =>
      handle.includes(weight.id)
    )

    switch (matching_scores.length) {
      case 0:
        matching_scores = scores_to_check.filter(({ handle }) =>
          handle.includes(weight.id.replace("Prom.", ""))
        )

        switch (matching_scores.length) {
          case 0:
            matching_scores = scores_to_check.filter(({ label }) =>
              label.includes(weight.id)
            )

            switch (matching_scores.length) {
              case 0:
                // no matching scores
                console.log(formula)
                console.log("no matching scores. testing")
                break

              case 1:
                evaluations.push({
                  handle: matching_scores[0].handle.replace(" 1", ""),
                  label: weight.id,
                  can_be_deleted: matching_scores[0].can_be_deleted,
                  weight: weight.weight,
                  score: matching_scores[0].score,
                })

                // remove from scores_to_check
                scores_to_check.splice(
                  scores_to_check.findIndex(
                    ({ handle: handle_to_check }) =>
                      handle_to_check === matching_scores[0].handle
                  ),
                  1
                )

                break

              default:
                const sum_of_weights = matching_scores.reduce(
                  (acc, { raw_weight }) => acc + raw_weight,
                  0
                )

                matching_scores.forEach(
                  ({ handle, can_be_deleted, raw_weight, score }) => {
                    evaluations.push({
                      handle: handle.replace(" ", ""),
                      label: weight.id,
                      can_be_deleted,
                      weight: weight.weight
                        ? roundTo(
                            (weight.weight * raw_weight) / sum_of_weights,
                            4
                          )
                        : null,
                      score,
                    })

                    // remove from scores_to_check
                    scores_to_check.splice(
                      scores_to_check.findIndex(
                        ({ handle: handle_to_check }) =>
                          handle_to_check === handle
                      ),
                      1
                    )
                  }
                )

                break
            }

            break

          case 1:
            console.log(formula)
            console.log("one matching score. Prom. testing")
            break

          default:
            matching_scores.forEach(
              ({ handle, label, can_be_deleted, score }) => {
                evaluations.push({
                  handle: handle.replace(" ", ""),
                  label,
                  can_be_deleted,
                  weight: weight.weight
                    ? roundTo(weight.weight / matching_scores.length, 4)
                    : null,
                  score,
                })

                // remove from scores_to_check
                scores_to_check.splice(
                  scores_to_check.findIndex(
                    ({ handle: handle_to_check }) => handle_to_check === handle
                  ),
                  1
                )
              }
            )

            break
        }

        break

      case 1:
        evaluations.push({
          handle: weight.id,
          label: matching_scores[0].label
            .replace(last_number_matcher, "")
            .trim(),
          weight: weight.weight,
          can_be_deleted: matching_scores[0].can_be_deleted,
          score: matching_scores[0].score,
        })

        // remove from scores_to_check
        scores_to_check.splice(
          scores_to_check.findIndex(
            ({ handle }) => handle === matching_scores[0].handle
          ),
          1
        )
        break
      default:
        const total_weight_sum = matching_scores.reduce(
          (acc, { raw_weight }) => acc + raw_weight,
          0
        )

        matching_scores.forEach(
          ({ handle, label, can_be_deleted, raw_weight, score }) => {
            evaluations.push({
              handle: handle.replace(" ", ""),
              label,
              can_be_deleted,
              weight: weight.weight
                ? roundTo(weight.weight * (raw_weight / total_weight_sum), 4)
                : null,
              score,
            })

            // remove from scores_to_check
            scores_to_check.splice(
              scores_to_check.findIndex(
                ({ handle: handle_to_check }) => handle_to_check === handle
              ),
              1
            )
          }
        )

        break
    }
  }

  return { evaluations, wrong_formula: false }
}
