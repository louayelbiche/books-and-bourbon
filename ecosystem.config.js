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
      },
    },
  ],
}
