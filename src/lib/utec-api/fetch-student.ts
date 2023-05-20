const example_utec_api_response = {
  status: 200,
  message: "success",
  content: {
    avatar:
      "https://system.na2.netsuite.com/core/media/media.nl?id=2294937&c=4535271&h=WLlsFuB6yoZT1ZgWMQzM0asBLrI6j12r5IHmsjhbZR_vNdj_",
    name: "Anthony Ivan   Cueva Paredes",
    career: "Ingeniería Civil",
    faculty: "Facultad de Ingeniería ",
    code: "201910132",
    level: "-",
    barcode: "201910132",
    language: "ES",
    email: "anthony.cueva@utec.edu.pe",
    dni: "75004619",
    entryPeriod: "2019 - 1",
    document: "DOCUMENTO NACIONAL DE IDENTIDAD (DNI)",
    orderMerit: "117",
    weightAverage: "15.34",
    lastName: "Cueva Paredes",
    codEncryptDebt: "qYKV62SrQ9ImBiJhW8D8dQ==",
    program: { codPrograma: "1", nomPrograma: "Pregrado" },
    student: true,
    ordenMerit: "117",
  },
};

export const getStudent = async ({
  utec_token_v2,
}: {
  utec_token_v2: string;
}) => {
  const response = await fetch(
    "https://api.utec.edu.pe/user-configuration-api/user/information/data",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${utec_token_v2}`,
        "X-Auth-Token": "hey",
        "Content-Type": "application/json",
      },
      body: "{}",
    }
  );

  if (response.status === 401 || response.status === 403) {
    throw new Error("Unauthorized: invalid token v2");
  }

  if (response.status !== 200) {
    throw new Error("Internal Server Error: error fetching user data");
  }

  const data = (await response.json()) as typeof example_utec_api_response;
  if (!data.content.student) {
    throw new Error("Forbidden: user is not a student");
  }

  return {
    email: data.content.email,
    order_merit: parseInt(data.content.orderMerit),
    score: parseFloat(data.content.weightAverage),
    utec_id: data.content.code,
    first_name: data.content.name.split(" ")[0],
  };
};
