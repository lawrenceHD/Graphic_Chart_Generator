# Development environment for Git Bash: `. tools/dev-env.sh` then start an app.
# .env.example gives the substitutes; any variable named in .env.local (secrets, DATABASE_URL) is left
# unset here so that the apps read it from .env.local (Next.js and `node --env-file` never override).
set -a
. ./.env.example
set +a
if [ -f .env.local ]; then
  for name in $(sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*\)=.*/\1/p' .env.local); do
    unset "$name"
  done
fi
