var window = self;

self.importScripts("/static/js/custom/indexDB.js");
self.importScripts("/static/js/custom/utils.js");
self.importScripts(
  "https://cdnjs.cloudflare.com/ajax/libs/blueimp-md5/2.19.0/js/md5.min.js"
);
self.addEventListener("install", (event) => {
  console.log("V1 installing…");

  // event.waitUntil(
  //   caches.open("static-v1").then((cache) => cache.add("/static/image/cat.png"))
  // );
});

self.addEventListener("activate", (event) => {
  console.log("V1 now ready to handle fetches!");
});

self.addEventListener("fetch", (event) => {
  // const url = new URL(event.request.url);
  // console.log("this is service worker fetch event", url);
  // if (url.pathname == "/static/image/dog.png") {
  //   event.respondWith(caches.match("/static/image/cat.png"));
  // }
});

self.addEventListener("sync", async function (event) {
  if (event.tag == "sync_video") {
    event.waitUntil(
      getAll("video_os").then(async function (data) {
        videoList = data.filter((e) => e.sync != 1);
        for (let x in videoList) {
          let chunkSize = "5";
          let infomation = {
            filename: new Date().getTime(),
            blob_array_checksum: [],
            belongs_to_checksum: "",
            chunks_length: 0,
          };

          for (let y in videoList[x].blob) {
            let md5checksum = md5(videoList[x].blob[y]);
            // let md5checksum = md5(
            //   new Int8Array(await videoList[x].blob[y].arrayBuffer())
            // );
            infomation.blob_array_checksum.push(`${y}-${md5checksum}`);
          }
          for (let y in videoList[x].blob) {
            let md5checksum = md5(videoList[x].blob[y]);

            // let md5checksum = md5(
            //   new Int8Array(await videoList[x].blob[y].arrayBuffer())
            // );
            let chunks = sliceFileToChunk(videoList[x].blob[y], chunkSize);
            infomation.chunks_length = chunks.length;
            infomation.belongs_to_checksum = md5checksum;

            for (let i in chunks) {
              var file = new File([chunks[i]], `${i}-${md5checksum}`, {
                type: "video/webm",
              });

              let formData = new FormData();
              formData.append("information", JSON.stringify(infomation));
              formData.append("file", file);
              fetch("https://l31.ezsite.online:4001/uploadvideo", {
                body: formData,
                method: "POST",
              })
                .then((data) => console.log(`${i}-${md5checksum} uploaded`))
                .catch((e) => console.log(`${i}-${md5checksum} failed`));
            }
          }
          console.log(infomation);
          console.log("==================");
        }
      })
    );
  }
});
