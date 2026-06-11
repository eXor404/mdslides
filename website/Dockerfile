# Static site image — the GitHub Actions workflow runs `npm run build`
# at the repo root before invoking `docker build`, so dist/ is expected
# to exist in the build context.

FROM nginx:1.27-alpine

COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
