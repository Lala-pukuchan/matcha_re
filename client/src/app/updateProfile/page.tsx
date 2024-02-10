"use client";
import { useEffect, useState } from "react";
import { useUser } from "../../../context/context";

export default function updateProfile() {
  // set registered user information
  const user = useUser();
  const [selectedGender, setSelectedGender] = useState("");
  const [selectedPreGender, setSelectedPreGender] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState([]);

  useEffect(() => {
    if (user) {
      console.log("user: ", user);
      if (user && user.gender) {
        setSelectedGender(user.gender);
      }
      if (user && user.preference) {
        setSelectedPreGender(user.preference);
      }
      if (user && user.tagIds) {
        let tagArray = [];
        for (const tagId of user.tagIds) {
          tagArray.push(parseInt(tagId, 10));
        }
        setSelectedTagIds(tagArray);
      }
    }
  }, [user]);

  // set message
  const [message, setMessage] = useState("");

  // set tags
  const [tags, setTags] = useState([]);
  const [inputTag, setInputTag] = useState("");

  // set created tags
  useEffect(() => {
    async function setCreatedTags() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/tags`
        );
        if (response.status === 200) {
          const data = await response.json();
          setTags(data);
        } else {
          const data = await response.json();
          setMessage(data.message);
        }
      } catch (e) {
        console.error(e);
      }
    }
    setCreatedTags();
  }, []);

  // change add tag value
  const handleChange = (event) => {
    setInputTag(event.target.value);
    setMessage("");
  };

  // handle checked tags
  const handleTags = (event) => {
    const { value, checked } = event.target;
    const tagId = parseInt(value, 10);
    if (checked) {
      setSelectedTagIds((prev) => [...prev, tagId]);
    } else {
      setSelectedTagIds((prev) => prev.filter((id) => id !== tagId));
    }
  };

  // add tag
  async function createNewTag() {
    if (inputTag === "") {
      setMessage("Please input tag name.");
    } else {
      const newTagJson = JSON.stringify({ name: inputTag });
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/tag`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: newTagJson,
          }
        );
        if (response.status === 200) {
          const newTag = await response.json();
          setTags([...tags, newTag]);
        } else {
          const data = await response.json();
          setMessage(data.message);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }
  const addTag = (event) => {
    createNewTag();
  };

  // submit login form
  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/update`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );
      if (response.status === 200) {
        window.location.href = "/myAccount";
      } else {
        const data = await response.json();
        setMessage(data.message);
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div>
      <form
        onSubmit={updateProfile}
        encType="multipart/form-data"
        className="container mx-auto w-screen"
      >
        <input
          type="text"
          id="userId"
          name="userId"
          defaultValue={user ? user.id : ""}
          className="hidden"
          readOnly
        />
        <div className="flex flex-col m-10 space-y-4">
          <div className="grid grid-cols-2">
            <label htmlFor="lastname" className="font-bold">
              lastname
            </label>
            <input
              type="text"
              id="lastname"
              name="lastname"
              placeholder="lastname"
              required
              defaultValue={user ? user.lastname : ""}
              className="bg-gray-100 p-3 rounded"
            />
          </div>
          <div className="grid grid-cols-2">
            <label htmlFor="firstname" className="font-bold">
              firstname
            </label>
            <input
              type="text"
              id="firstname"
              name="firstname"
              placeholder="firstname"
              required
              defaultValue={user ? user.firstname : ""}
              className="bg-gray-100 p-3 rounded"
            />
          </div>
          <div className="grid grid-cols-2">
            <label htmlFor="email" className="font-bold">
              email
            </label>
            <input
              type="text"
              id="email"
              name="email"
              placeholder="email"
              required
              defaultValue={user ? user.email : ""}
              className="bg-gray-100 p-3 rounded"
            />
          </div>
          <div className="grid grid-cols-2">
            <label htmlFor="gender" className="font-bold">
              Gender
            </label>
            <div className="p-3 rounded">
              <input
                type="radio"
                id="male"
                name="gender"
                value="male"
                className="m-1"
                checked={selectedGender === "male"}
                onChange={() => setSelectedGender("male")}
              />
              <label htmlFor="male">Male</label>
              <input
                type="radio"
                id="female"
                name="gender"
                value="female"
                className="m-1"
                checked={selectedGender === "female"}
                onChange={() => setSelectedGender("female")}
              />
              <label htmlFor="female">Female</label>
            </div>
          </div>
          <div className="grid grid-cols-2">
            <label htmlFor="preference" className="font-bold">
              Gender You Like
            </label>
            <div className="p-3 rounded">
              <input
                type="radio"
                id="male-pre"
                name="preference"
                value="male"
                className="m-1"
                checked={selectedPreGender === "male"}
                onChange={() => setSelectedPreGender("male")}
              />
              <label htmlFor="male-pre">Male</label>
              <input
                type="radio"
                id="female-pre"
                name="preference"
                value="female"
                className="m-1"
                checked={selectedPreGender === "female"}
                onChange={() => setSelectedPreGender("female")}
              />
              <label htmlFor="female-pre">Female</label>
            </div>
          </div>
          <div className="grid grid-cols-2">
            <label htmlFor="biography" className="font-bold">
              biography
            </label>
            <input
              type="text"
              id="biography"
              name="biography"
              placeholder="biography"
              required
              defaultValue={user ? user.biography : ""}
              className="bg-gray-100 p-3 rounded"
            />
          </div>
          <div className="grid grid-cols-2">
            <div>
              <h2 className="font-bold">Tags</h2>
            </div>
            <div>
              <ul>
                {tags.map((tag) => (
                  <li key={tag.id}>
                    <input
                      id={tag.id}
                      type="checkbox"
                      value={tag.id}
                      name="tags"
                      checked={selectedTagIds.includes(tag.id)}
                      onChange={(event) => handleTags(event)}
                    ></input>
                    <label htmlFor={tag.id} className="pl-2">
                      {tag.name}
                    </label>
                  </li>
                ))}
              </ul>
              <div className="grid grid-cols-2">
                <input
                  type="text"
                  id="addingTag"
                  name="addingTag"
                  value={inputTag}
                  onChange={handleChange}
                  placeholder="#camping"
                  className="bg-gray-100 m-1 p-1 rounded inline-block"
                />
                <button
                  onClick={addTag}
                  className="m-3 w-10 h-7 rounded bg-cyan-400 text-white inline-block"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2">
            <label htmlFor="profilePicture" className="font-bold">
              Profile Picture
            </label>
            <input
              type="file"
              id="profilePicture"
              name="profilePicture"
              placeholder="profilePicture"
              accept="image/*"
              required
              className="bg-gray-100 p-3 rounded"
            />
          </div>
          <div className="grid grid-cols-2">
            <label htmlFor="picture1" className="font-bold">
              Picture1
            </label>
            <input
              type="file"
              id="picture1"
              name="picture1"
              placeholder="picture1"
              accept="image/*"
              className="bg-gray-100 p-3 rounded"
            />
          </div>
          <div className="grid grid-cols-2">
            <label htmlFor="picture2" className="font-bold">
              Picture2
            </label>
            <input
              type="file"
              id="picture2"
              name="picture2"
              placeholder="picture2"
              accept="image/*"
              className="bg-gray-100 p-3 rounded"
            />
          </div>
          <div className="grid grid-cols-2">
            <label htmlFor="picture3" className="font-bold">
              Picture3
            </label>
            <input
              type="file"
              id="picture3"
              name="picture3"
              placeholder="picture3"
              accept="image/*"
              className="bg-gray-100 p-3 rounded"
            />
          </div>
          <div className="grid grid-cols-2">
            <label htmlFor="picture4" className="font-bold">
              Picture4
            </label>
            <input
              type="file"
              id="picture4"
              name="picture4"
              placeholder="picture4"
              accept="image/*"
              className="bg-gray-100 p-3 rounded"
            />
          </div>
          <div className="grid grid-cols-2">
            <label htmlFor="picture5" className="font-bold">
              Picture5
            </label>
            <input
              type="file"
              id="picture5"
              name="picture5"
              placeholder="picture5"
              accept="image/*"
              className="bg-gray-100 p-3 rounded"
            />
          </div>
          <button
            type="submit"
            className="w-40 h-9 rounded bg-pink-400 text-white"
          >
            Update
          </button>
          <div className="text-red-500">{message}</div>
        </div>
      </form>
    </div>
  );
}
