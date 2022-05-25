function sliceFileToChunk(file, mb) {
  var blob_array = [];
  var chunkSize = 1024 * 1024 * mb; //16MB Chunk size
  var fileSize = file.size;
  var currentChunk = 1;
  var totalChunks = Math.ceil(fileSize / chunkSize, chunkSize);

  while (currentChunk <= totalChunks) {
    var offset = (currentChunk - 1) * chunkSize;
    var currentFilePart = file.slice(offset, offset + chunkSize);
    blob_array.push(currentFilePart);
    // console.log("Current chunk number is ", currentChunk);
    // console.log("Current chunk data", currentFilePart);

    currentChunk++;
  }
  return blob_array;
}
