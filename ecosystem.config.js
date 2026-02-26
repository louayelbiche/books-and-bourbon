module.exports = {
  apps: [
    {
      name: 'books-and-bourbon',
      script: 'npm',
      args: 'start',
      cwd: '/opt/books-and-bourbon',
      env: {
        NODE_ENV: 'production',
        PORT: 9201,
        SERVICE_NAME: 'books-and-bourbon',
      },
      error_file: '/opt/runwell/logs/books-and-bourbon-error.log',
      out_file: '/opt/runwell/logs/books-and-bourbon-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
}
