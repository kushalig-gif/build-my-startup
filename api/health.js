module.exports = function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: "build-my-startup-api",
    timestamp: new Date().toISOString()
  });
};
