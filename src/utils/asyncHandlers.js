const asyncHandler = (requestHandler) => {
    (req, res, next) => {
        Promise
        .resolve(requestHandler(res, req, next))
        .catch((error) => next(error))
    }
}

export { asyncHandler }