import { app } from './app';
import { config } from './config/environment';

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`)
}) 