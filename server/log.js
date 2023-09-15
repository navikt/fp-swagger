import winston from 'winston';
import morgan from 'morgan';

const { format } = winston;
const { combine, json, timestamp } = format;

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const level = () => {
  const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
  return isDevelopment ? 'debug' : 'info';
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

const stdoutLogger = winston.createLogger({
  level: level(),
  levels,
  transports: [
    new winston.transports.Console({
      format: combine(timestamp(), json()),
    }),
  ],
});

const debug = (msg) => {
  stdoutLogger.debug(msg.replace(/\n|\r/g, ""));
};

const info = (msg) => {
  stdoutLogger.info(msg.replace(/\n|\r/g, ""));
};

const warning = (msg) => {
  stdoutLogger.warn(msg.replace(/\n|\r/g, ""));
};

const error = (msg, err) => {
  if (err) {
    stdoutLogger.error(msg, { message: `: ${err.message}` });
  } else {
    stdoutLogger.error(msg, { message: `: ${err}` });
  }
};

const stream = {
  // Use the http severity
  write: (message) => stdoutLogger.http(message.replace(/\n|\r/g, "")),
};

const skip = () => process.env.NODE_ENV === 'production';

const vanligFormat = ':method :url :status :res[content-length] - :response-time ms';

const morganMiddleware = morgan(
  vanligFormat, { stream, skip },
);

export default {
  debug,
  info,
  warning,
  error,
  logger: stdoutLogger,
  morganMiddleware,
};
