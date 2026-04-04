# Enabling Automatic Deployment

- Ensure that `package.json` includes a script named `deploy` which runs `dcl deploy`
- Ensure the branch specified in `.github\workflows\main.yml` matches the branch you wish to deploy to; the default is `deploy`
- In GitHub repository **Settings -> Secrets and variables -> Actions**, create a key `DCL_PRIVATE_KEY` in the \*_Repository secrets_ containing the Private key of a wallet authorised to deploy.

**Important**: use a different wallet than that which owns the plot. Create a single-use wallet with deployment rights which can be revoked if this repository is compromised and the private key is leaked.
