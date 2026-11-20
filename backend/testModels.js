require("dotenv").config();
const axios = require("axios");

async function getModels() {
  try {
    const res = await axios.get(
      "https://openrouter.ai/api/v1/models",
      {
        headers: {
          Authorization:
            `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type":
            "application/json",
        },
      }
    );

    const freeModels =
      res.data.data.filter(
        (m) =>
          m.id.includes(":free")
      );

    console.log(
      freeModels.map(
        (m) => m.id
      )
    );
  } catch (err) {
    console.log(
      err.response?.data ||
      err.message
    );
  }
}

getModels();
