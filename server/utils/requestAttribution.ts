export type RequestAuthor = {
  id: string;
  role: 'admin' | 'personnel';
};

export type RequesterProfile = {
  name: string;
  department: string;
};

export type SubmittedRequester = {
  requesterId: string;
  requesterName: string;
  department: string;
};

export function resolveRequestAttribution(
  author: RequestAuthor,
  profile: RequesterProfile | null,
  submitted: SubmittedRequester,
): SubmittedRequester {
  if (author.role === 'admin') return submitted;
  if (!profile) throw new Error('A current personnel profile is required to create a request.');

  return {
    requesterId: author.id,
    requesterName: profile.name,
    department: profile.department,
  };
}
