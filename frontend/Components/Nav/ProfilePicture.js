import React, { useState } from "react";
import Modal from "@components/Modal";
import UserProfile from "@components/UserProfile/UserProfile";
import { useAuth } from "@contexts/AuthProvider";

export default function ProfilePicture() {
  const [showUserProfile, setShowUserProfile] = useState(false);

  const { user } = useAuth();
  return (
    <>
      <button
        type="button"
        className="nav__profile"
        onClick={() => setShowUserProfile(true)}
      >
        <img
          src={user.picture}
          alt={`Avatar of ${user.firstName}`}
          width="40px"
          height="40px"
          className="nav__avatar"
        />
      </button>

      <Modal
        shouldOpen={showUserProfile}
        classToToggle={{
          modal: "modal--profile",
          child: "profile--active",
        }}
        setStateRef={setShowUserProfile}
      >
        <UserProfile setShowUserProfile={setShowUserProfile} />
      </Modal>
    </>
  );
}