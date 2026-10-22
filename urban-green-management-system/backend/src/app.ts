import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import routes from './routes';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN }));
app.use(express.json({ limit: '1mb' }));
if (env.NODE_ENV === 'development') app.use(morgan('dev'));

app.use('/api/v1', routes);

// Order matters: 404 first, centralized error handler last.
app.use(notFound);
app.use(errorHandler);

export default app;
