const puppeteer = require("puppeteer");
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
app.use(bodyParser.json());
const cors = require("cors");


// Enable CORS to allow requests from your frontend
app.use(cors());

const downloadImages = async (url) => {
  if (!url) {
    console.error("Error: URL is undefined or empty.");
    return;
  }
  const options = {
    headless: true,
    ignoreHTTPSErrors: true,
  };

  const browser = await puppeteer.launch(options);
  try {
    const page = await browser.newPage();
    console.log(`Navigating to URL: ${url}`);

    await page.goto(url);

    // Wait for the images to load (you might need to adjust the selector)
    await page.waitForSelector(
      ".next-slick-list .next-slick-track .next-slick-slide .item-gallery__image-wrapper img",
      { timeout: 10000 }
    );

    // Get the image URLs
    const imageUrls = await page.evaluate(() => {
      const imageElements = document.querySelectorAll(
        ".next-slick-list .next-slick-track .next-slick-slide .item-gallery__image-wrapper img"
      );
      const urls = [];
      imageElements.forEach((img) => {
        const src = img.getAttribute("src");
        if (src) {
          const firstUnderscoreIndex = src.indexOf("_");
          const convertedUrl =
            firstUnderscoreIndex !== -1
              ? src.substring(0, firstUnderscoreIndex)
              : src;
          console.log(convertedUrl);
          urls.push(convertedUrl);
        }
      });
      return urls;
    });

    // Convert images to base64 strings
    const imageBase64Array = [];
    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      const response = await fetch(imageUrl);
      const buffer = await response.arrayBuffer();
      const base64String = Buffer.from(buffer).toString("base64");
      imageBase64Array.push(`data:image/jpeg};base64,${base64String}`);
    }
    return imageBase64Array;
  } catch (error) {
    console.error(`Error downloading images from ${url}:`, error);
    throw error;
  } finally {
    await browser.close();
  }
};

app.use(express.static(path.join(__dirname, "./index.html")));
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.post("/api/download-images", async (req, res) => {
  const { url} = req.body;
  const apiKey = req.headers['x-api-key'];
    if (apiKey !== 'test-API-KEY') { 
      res.status(401).json({ message: 'Unauthorized access !' }); 
      console.log('Unauthorized access attempted!');
      return;// Return unauthorized status
    } 
  try {
    const imageBase64Array = await downloadImages(url);
    console.log(`Responded ${imageBase64Array.length} images`);
    res.json(imageBase64Array);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to download images" });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "./index.html"));
});


