if (process.env.NODE_ENV === "production") {
  console.log = function () {};
  console.error = function () {};
}
