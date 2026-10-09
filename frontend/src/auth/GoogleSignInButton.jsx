import { GoogleLogin } from '@react-oauth/google'

const GoogleSignInButton = ({ onCredential, onError }) => {
  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    return (
      <p className="text-center text-xs text-[#94a3b8]">
        Google sign-in is not configured for this deployment.
      </p>
    )
  }

  return (
    <div className="flex justify-center">
      <GoogleLogin
        onSuccess={(response) => {
          if (response.credential) onCredential(response.credential)
          else onError()
        }}
        onError={onError}
        theme="outline"
        size="large"
        text="continue_with"
        shape="rectangular"
        width="280"
      />
    </div>
  )
}

export default GoogleSignInButton