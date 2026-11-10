const downloadFile = (content: string, filename: string, type = "text/plain;charset=utf-8") => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = filename;
  a.click();
  // Revoking right away can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
export default downloadFile;
