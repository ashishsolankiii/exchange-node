//Check image url exist
async function checkImageExist(url) {
  let data = "";
  await fetch(url)
    .then((response) => {
      if (response.ok) {
        data = url;
      } else {
        data = "";
      }
    })
    .catch(() => {
      data = "";
    });
  return data;
}

export { checkImageExist };
