import { app } from "./src/app";
import { env } from "./src/config/env";

app.listen(env.PORT, env.HOST, () =>
  console.log(`Backend listening on ${env.HOST}:${env.PORT}`),
);
