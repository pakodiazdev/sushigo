FROM cypress/included:13.17.0

# The base image ships third-party apt repos (google-chrome, microsoft-edge) whose signing keys
# drift over time and break `apt-get update` on a fresh build — CI hit
# "NO_PUBKEY FD533C07C264648F ... dl.google.com/linux/chrome/deb ... is not signed". They are not
# needed to add the Docker CLI (Cypress's bundled browsers are baked into the image), so drop them.
# Install Docker CLI so cy.task('db:reset') can call docker exec
RUN rm -f /etc/apt/sources.list.d/google-chrome.list \
          /etc/apt/sources.list.d/microsoft-edge*.list \
    && apt-get update \
    && apt-get install -y ca-certificates curl gnupg \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg \
       | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && chmod a+r /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
       https://download.docker.com/linux/debian bookworm stable" \
       | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update \
    && apt-get install -y docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*
