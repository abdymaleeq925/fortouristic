import { ID, OAuthProvider, Query } from "appwrite";
import { redirect } from "react-router";
import { account, appwriteConfig, database } from "~/appwrite/client";

export const loginWithGoogle = async() => {
    try {
        account.createOAuth2Session(OAuthProvider.Google, 'http://localhost:5173', 'http://localhost:5173/sign-in')
    } catch(e){
        console.log('loginWithGoogle:', e);
    }
}

export const getUser = async() => {
    try {
        const user = await account.get();
        if(!user) return redirect('/sign-in');

        const {documents} = await database.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.usersCollectionId,
            [
                Query.equal("accountId", user.$id),
                Query.select(["name", "email", "imageUrl", "joinedAt", "accountId"])
            ]
        )
        return documents.length > 0 ? documents[0] : redirect('/sign-in');
    } catch(e){
        console.log(e);
    }
}

export const logoutUser = async() => {
    try {
        await account.deleteSession('current')
        return true;
    } catch(e){
        console.log('logoutUser',e);
    }
}

export const getAllUsers = async(limit:number, offset:number) => {
    try {
        const {documents: users, total} = await database.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.usersCollectionId,
            [
                Query.limit(limit), Query.offset(offset)
            ]
        ) 
        if (total === 0) return {users:[], total};
        return {users, total};
    } catch(e) {
        console.log('Error fetching users', e);
        return {users:[], total:0}
    }
}

export const getGooglePicture = async() => {
    try {
        const session = await account.getSession("current");
        const oAuthToken = session.providerAccessToken;
        if(!oAuthToken) {
            console.log("No oAuthToken availiable");
            return null;
        }

        const response = await fetch("https://people.googleapis.com/v1/people/me?personFields=photos", {
            headers: {
                Authorization: `Bearer ${oAuthToken}`
            }
        })

        if(!response.ok) {
            console.log("Failed to fetch profile photo from Google People API");
            return null;
        }

        const data = await response.json();
        const photoUrl = data?.photos && data?.photos?.length > 0 ? data?.photos[0]?.url : null;

        return photoUrl;
    } catch(e){
        console.log('getGooglePicture', e);
    }
}

export const storeUserData = async() => {
    try {
        const user = await account.get();

        if(!user) return null;

        const {documents} = await database.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.usersCollectionId,
            [
                Query.equal("accountId", user.$id)
            ]
        )

        if(documents.length > 0) return documents[0];

        const imageUrl = await getGooglePicture();

        const newUser = await database.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.usersCollectionId,
            ID.unique(),
            {
                accountId: user.$id,
                email: user.email,
                name: user.name,
                imageUrl: imageUrl || "",
                joinedAt: new Date().toISOString()
            }
        )

        return newUser;
    } catch(e){
        console.log('storeUserData:',e);
    }
}

export const getExistingUser = async() => {
    try {
        const user = await account.get();
        if(!user) return null;

        const {documents} = await database.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.usersCollectionId,
            [
                Query.equal("accountId", user.$id)
            ]
        )

        if(documents.length === 0) return null;

        return documents[0];
    } catch(e){
        console.log('getExistingUser:', e);
    }
}