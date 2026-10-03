const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
export default {
  output: 'export',
  trailingSlash: true,
  basePath,
  transpilePackages: ['texloom'],
  images: { unoptimized: true },
  poweredByHeader: false,
};
