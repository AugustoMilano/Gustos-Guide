import { Link } from 'react-router-dom'

/** Owner tools sit behind the owner page (password checked by the server), not the visitor sign-in. */
export function OwnerSignInLink({ className = 'btn btn-coral mt-3' }: { className?: string }) {
  return (
    <Link className={className} to="/owner">
      Owner sign-in
    </Link>
  )
}
