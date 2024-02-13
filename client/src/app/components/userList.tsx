import Link from "next/link";
import Heart from "./heart";
import Geo from "./geo";

export default function UsersList({ users, operationUserId, likedUsersId }) {
  return (
    <div className="flex flex-col m-10 space-y-4">
      {users.map((user) => (
        <div key={user.id} className="grid grid-cols-5">
          <div>
            <Link href={`/users?userID=${user.id}`}>
              {user && user.profilePic ? (
                <img
                  src={user.profilePic}
                  alt="Profile Pic"
                  className="h-80 w-80 object-cover rounded"
                />
              ) : (
                <div className="h-80 w-80 bg-gray-200 rounded">No Image</div>
              )}
              {user.username}
            </Link>
            <Heart
              likeFromUserId={operationUserId}
              likeToUserId={user.id}
              alreadyLiked={likedUsersId.includes(user.id)}
            />
            <Geo 
              lat={user.latitude}
              lon={user.longitude}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
