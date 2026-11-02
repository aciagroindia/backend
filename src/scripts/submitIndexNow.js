const fs = require("fs");
const path = require("path");
const axios = require("axios");

const HOST = "aciagro.com";
const API_KEY = process.env.INDEXNOW_API_KEY;
const KEY_LOCATION = `https://${HOST}/${API_KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";

async function submitIndexNow() {
  try {
    if (!API_KEY) {
      throw new Error("INDEXNOW_API_KEY environment variable is missing.");
    }

    const filePath = path.join(__dirname, "indexnow-urls.txt");

    if (!fs.existsSync(filePath)) {
      throw new Error("indexnow-urls.txt file not found.");
    }

    const urls = fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((url) => url.trim())
      .filter(
        (url) =>
          url.startsWith(`https://${HOST}/`) ||
          url === `https://${HOST}`
      );

    const uniqueUrls = [...new Set(urls)];

    if (uniqueUrls.length === 0) {
      throw new Error("No valid URLs found.");
    }

    console.log(`Found ${uniqueUrls.length} unique URLs.`);

    // IndexNow supports up to 10,000 URLs per request.
    const batchSize = 1000;

    for (let i = 0; i < uniqueUrls.length; i += batchSize) {
      const batch = uniqueUrls.slice(i, i + batchSize);

      const response = await axios.post(
        ENDPOINT,
        {
          host: HOST,
          key: API_KEY,
          keyLocation: KEY_LOCATION,
          urlList: batch,
        },
        {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
          timeout: 30000,
          validateStatus: () => true,
        }
      );

      console.log(
        `Batch ${Math.floor(i / batchSize) + 1}: HTTP ${response.status}`
      );

      if (response.status !== 200 && response.status !== 202) {
        console.error("IndexNow response:", response.data);
        throw new Error(`IndexNow submission failed: HTTP ${response.status}`);
      }
    }

    console.log("All URLs submitted successfully.");
    console.log(`Total submitted: ${uniqueUrls.length}`);
  } catch (error) {
    console.error("IndexNow Error:", error.response?.data || error.message);
    process.exitCode = 1;
  }
}

submitIndexNow();
