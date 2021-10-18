import axios from "axios";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import Jimp from "jimp";
import path from "path";
import { TwitterClient } from "twitter-api-client";
dotenv.config();
const __dirname = path.resolve();
const app = express();
const port = process.env.PORT;

app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "/index.html")));
app.listen(port, async () => {
  console.log(`Twitter-header app listening on port ${port}!`);
  setInterval(async () => {
    await headerMain();
  }, 60000);
});
const twitterClient = new TwitterClient({
  apiKey: process.env.API_KEY,
  apiSecret: process.env.API_SECRET,
  accessToken: process.env.ACCESS_TOKEN,
  accessTokenSecret: process.env.TOKEN_SECRET,
});

export const headerMain = async () => {
  try {
    console.info("Entered [headerMain]");
    const followerData = await twitterClient.accountsAndUsers.followersList({
      screen_name: process.env.TWITTER_HANDLE,
      count: 3,
    });
    const { users = null } = followerData;
    if (users) {
      const images = ["./assets/banner.png"];
      const usersArr = [];
      for (const user of users) {
        const name = `img-${user.id}.png`;
        const path = `./assets/${name}`;
        const url = user.profile_image_url_https;
        await downloadImages(url, path);
        usersArr.push(user.screen_name.trim().substring(0, 15));
        images.push(path);
        1;
      }
      await concatenateImages(images, usersArr);
      console.log("Image Uploaded Successfully!");
      await deleteImage(images[1]);
      await deleteImage(images[2]);
      await deleteImage(images[3]);
    }
  } catch (error) {
    console.error(`[headerMain] - ${JSON.stringify(error)}`);
  }
};

const downloadImages = async (url, path) => {
  try {
    const res = await axios.get(url, { responseType: "stream" });
    const writerRes = res.data?.pipe(fs.createWriteStream(path));
    writerRes.on("finish", () => {
      console.log(`file ${path} Downloaded Successfully`);
    });
    writerRes.on("error", (err) => {
      console.log(err);
      throw err;
    });
  } catch (error) {
    console.error(`Error - [downloadImages] ${JSON.stringify(error)}`);
    throw error;
  }
};

const concatenateImages = async (images = [], userArr = []) => {
  try {
    console.log(images);
    let jimpArr = [];
    for (const img of images) {
      const readImg = await Jimp.read(img);
      jimpArr.push(readImg);
    }
    const profileImages = [jimpArr[1], jimpArr[2], jimpArr[3]];
    profileImages.forEach((profile) => {
      profile.resize(90, 90).circle();
    });
    const font = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
    jimpArr[0]
      .composite(jimpArr[1], 1390, 135)
      .print(font, 1280, 170, userArr[0]);
    jimpArr[0]
      .composite(jimpArr[2], 1390, 255)
      .print(font, 1280, 300, userArr[1]);
    jimpArr[0]
      .composite(jimpArr[3], 1390, 375)
      .print(font, 1280, 410, userArr[2]);
    jimpArr[0].write("./assets/new-banner.png", async () => {
      console.log("New banner downloaded successfully");
      return await uploadImage();
    });
  } catch (error) {
    console.log("error in concatenating", error.stack);
    throw error;
  }
};
const uploadImage = async () => {
  try {
    console.log("Entered uploadImage");
    const base64 = fs.readFileSync("./assets/new-banner.png", {
      encoding: "base64",
    });
    await twitterClient.accountsAndUsers.accountUpdateProfileBanner({
      banner: base64,
    });
    console.log("Banner uploaded successfully!");
  } catch (error) {
    console.error(`[UploadImage] ${JSON.stringify(error)}`);
    throw error;
  }
};

const deleteImage = async (image) => {
  try {
    fs.unlinkSync(image);
  } catch (error) {
    console.error(`[deleteImage] ${JSON.stringify(error)}`);
    throw error;
  }
};
