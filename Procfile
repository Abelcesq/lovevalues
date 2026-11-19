# Next.js binds the port Heroku assigns. `next build` runs automatically via
# the Node buildpack's build step.
#
# THE RELEASE PHASE RUNS THE MIGRATIONS, and it is here because its absence
# cost a day. Heroku runs `release` after a successful build and before the
# new dynos take traffic; if it fails, the release is rolled back and the old
# code keeps serving. Without it, deploying code that needs a new column and
# remembering to migrate are two separate acts — and on 2026-11-19 production
# was found two migrations behind, with /me querying a table that did not
# exist there. The migrator is idempotent and skips what is already applied,
# so this is a no-op on every deploy that does not add one.
release: npm run db:migrate
web: npx next start -p $PORT
