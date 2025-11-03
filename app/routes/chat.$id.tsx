import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { default as IndexRoute } from './_index';

export async function loader(args: LoaderFunctionArgs) {
  // Simply pass the project ID to the component
  // Data loading will happen client-side to avoid server-side issues
  return json({ id: args.params.id });
}

export default IndexRoute;
