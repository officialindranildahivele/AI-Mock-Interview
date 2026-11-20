require("dotenv").config();
const axios = require("axios");

async function test() {
  try {
    const res = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-oss-20b:free",
        messages: [
          {
            role: "user",
            content:
              "Generate 5 Java interview questions"
          }
        ]
      },
      {
        headers: {
          Authorization:
            `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type":
            "application/json"
        }
      }
    );

    console.log(
      res.data.choices[0].message.content
    );
  } catch (err) {
    console.log(
      err.response?.data || err.message
    );
  }
}

test();