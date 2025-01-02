const checkAuth = (req, res, next) => {
    if (req.session.isLoggedIn) {
        next();
    } else {
        res.redirect('/');
    }
};

const checkUserType = (type) => {
    return (req, res, next) => {
        if (req.session.user && req.session.user.type === type) {
            next();
        } else {
            res.redirect('/');
        }
    };
};

module.exports = {
    checkAuth,
    checkUserType
};
