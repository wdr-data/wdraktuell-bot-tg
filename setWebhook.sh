#!/bin/bash

curl -X GET https://api.telegram.org/bot${TG_TOKEN}/setWebhook\?url\=https://prod.bot-tg.wdraktuell.wdr.cloud/tg/${TG_TOKEN}
