// The user is authorized to perform an action only if they are an admin or the owner of the review/order
const isAuthorized = (loggedUser, ownerId) => {
  return loggedUser.isAdmin || loggedUser._id.toString() === ownerId.toString();
};

module.exports = isAuthorized;
