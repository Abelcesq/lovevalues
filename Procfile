# Next.js binds the port Heroku assigns. `next build` runs automatically via the
# Node buildpack's build step, so there is no release phase here — and nothing
# to migrate, because this app has no database yet (answers live in the user's
# own browser). Add a `release:` line the day persistence lands.
web: npx next start -p $PORT
