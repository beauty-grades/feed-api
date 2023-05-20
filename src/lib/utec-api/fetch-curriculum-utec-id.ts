const example_utec_api_response = {
  timestamp: 1683302166191,
  uuid: null,
  status: 200,
  error: null,
  message: "OK",
  managed: true,
  content: [
    {
      academicProgramId: 421,
      tittle: "CI-2018-1",
    },
    {
      academicProgramId: 424,
      tittle: "AM-2018-1",
    },
  ],
};

export const fetchCurriculumId = async ({
  utec_token_v1,
  curriculum_id,
}: {
  utec_token_v1: string;
  curriculum_id: string;
}) => {
  const response = await fetch(
    "https://api.utec.edu.pe/academico-api/core/filtromalla/student/academic_programs?program=1",
    {
      headers: {
        "x-auth-token": utec_token_v1,
      },
    }
  );

  const json = (await response.json()) as typeof example_utec_api_response;

  const match = json.content.find(
    (curriculum) => curriculum.tittle === curriculum_id
  );

  if (!match) {
    throw new Error(`Curriculum ${curriculum_id} not found`);
  }

  return match.academicProgramId;
};
