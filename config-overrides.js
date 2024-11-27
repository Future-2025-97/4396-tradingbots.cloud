// config-overrides.js
module.exports = {
    webpack: (config, env) => {
        config.ignoreWarnings = [
            {
                module: /superstruct/,
                message: /source map/,
            },
        ];
        return config;
    },
};