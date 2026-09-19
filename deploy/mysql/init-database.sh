#!/bin/sh
# cspell:ignore uroot
# Runs once, on first start of an empty data volume. The image entrypoint has
# already created MYSQL_DATABASE and MYSQL_USER; this grants the user access to
# the per-project and IP-location databases.
set -eu

mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<SQL
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_USER}'@'%';
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE_PROJECT_PREFIX:-veysurProject}%\`.* TO '${MYSQL_USER}'@'%';
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE_IP_LOCATION:-veysurIpLocation}\`;
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE_IP_LOCATION:-veysurIpLocation}\`.* TO '${MYSQL_USER}'@'%';
FLUSH PRIVILEGES;
SQL
