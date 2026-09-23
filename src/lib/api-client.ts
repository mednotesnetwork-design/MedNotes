// The original export omitted its generated social API. Never fabricate records.
import {useQuery,useMutation} from '@tanstack/react-query';
async function request(path:string, method='GET', body?:unknown){
 const response=await fetch(import.meta.env.BASE_URL+'api/social/'+path,{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 if(!response.ok || !response.headers.get('content-type')?.includes('application/json'))throw new Error('The original social service is not connected. No changes were saved.');
 return response.json();
}
const query=<T=Record<string,any>[]>(path:string,args?:unknown,enabled=true)=>useQuery<T>({queryKey:[path,args],queryFn:()=>request(path),enabled,retry:false});
const mutation=(path:string,method='POST')=>useMutation({mutationFn:(body:unknown)=>request(path,method,body)});
export const useListUniversities=(p?:unknown)=>query('universities',p);
export const useListModules=(p?:unknown)=>query('modules',p);
export const useListSubjects=(p?:unknown)=>query('subjects',p);
export const useListNotes=(p?:unknown)=>query('notes',p);
export const useGetTopNotes=(p?:unknown)=>query<SocialNote[]>('notes/top',p);
export const useGetTrendingNotes=(p?:unknown)=>query<SocialNote[]>('notes/trending',p);
export const useGetLeaderboard=(p?:unknown)=>query<LeaderboardEntry[]>('leaderboard',p);
export const useGetLeaderboardChampions=(p?:unknown)=>query<{authorName:string;titleKey:string}[]>('leaderboard/champions',p);
export const useGetNote=(id:unknown,options?:{query?:{enabled?:boolean;queryKey?:unknown}})=>query<Record<string,any>&{tags:string}>('notes/'+encodeURIComponent(String(id)),undefined,options?.query?.enabled!==false);
export const useGetNoteRating=(id:unknown)=>query<Record<string,any>>('notes/'+encodeURIComponent(String(id))+'/rating');
export const useCreateNote=()=>mutation('notes');
export const useSaveNote=()=>mutation('notes/save');
export const useUpvoteNote=()=>mutation('notes/upvote');
export const useUpdateNote=()=>mutation('notes','PATCH');
export const useDeleteNote=()=>mutation('notes','DELETE');
export const useRateNote=()=>mutation('notes/rating');
export const getListNotesQueryKey=()=>['notes'];
export const getGetNoteQueryKey=(id:unknown)=>['notes/'+id];
export type LeaderboardEntry=Record<string,any>&{authorName:string;points:number;progressionRank:string;titles:string[]};

export type SocialNote=Record<string,any>&{id:number;title:string;upvotes:number;downloads:number;saves:number;tags?:string};
