import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth';
import errandsRouter from './routes/errands';
import walletRouter from './routes/wallet';
import sessionRouter from './routes/session';
import agentRouter from './routes/agent';

const app = express();
const PORT = process.env.PORT ?? 3001;

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',').filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// better-auth handles its own body parsing — mount BEFORE express.json()
app.all('/api/auth/*', toNodeHandler(auth));

app.use(express.json());

app.use('/api/errands', errandsRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/session', sessionRouter);
app.use('/api/agent', agentRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

// Swagger UI — accessible at /api/docs
const swaggerDocument = YAML.load(path.join(__dirname, 'openapi.yaml'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

export default app;
