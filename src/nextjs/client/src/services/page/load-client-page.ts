export function loadClientPage(
                  userProfile: any = undefined,
                  setProfileUser: any = undefined) {

  // Loader handling
  if (typeof window !== 'undefined') {
    const loader = document.getElementById('globalLoader')
    if (loader)
      loader.remove()
  }

  // Set userProfileId
  if (userProfile &&
      setProfileUser) {
    setProfileUser(userProfile)
  }
}
