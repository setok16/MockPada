module.exports = {
  handleError: (next, error) => {
    if (status) err.status = status;
    next(err);
  },
}
