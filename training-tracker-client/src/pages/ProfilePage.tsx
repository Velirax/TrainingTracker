interface ProfilePageProps { user: { displayName: string; email: string }; onSignOut: () => void; }

export default function ProfilePage({ user, onSignOut }: ProfilePageProps) {
  return <main><header className="page-header"><span className="page-kicker">Account</span><h1><span>Your</span> profile.</h1><p>Manage your Training Tracker account.</p></header><div className="profile-details"><div className="profile-avatar">{user.displayName.slice(0, 1).toUpperCase()}</div><dl><div><dt>Name</dt><dd>{user.displayName}</dd></div><div><dt>Email</dt><dd>{user.email}</dd></div></dl><button className="danger-button" type="button" onClick={onSignOut}>Sign out</button></div></main>;
}
