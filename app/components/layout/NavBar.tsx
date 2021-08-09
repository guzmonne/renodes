import { forwardRef } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCaretDown, faSignOutAlt, faUser, faHome } from "@fortawesome/free-solid-svg-icons"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"

import { useHasMounted } from "../../hooks/useHasMounted"
import type { UserBody } from "../../models/user"

export interface NavBarProps {
  user: UserBody | undefined;
}

export function NavBar({ user }: NavBarProps) {
  return (
    <div className="NavBar">
      <h1 className="Title">
        re<span className="Title__gradient">Task</span>
      </h1>
      {user
        ? <NavBar.User user={user} />
        : <NavBar.SignIn />
      }
    </div>
  )
}

NavBar.SignIn = () => {
  const hasMounted = useHasMounted()

  if (!hasMounted) return null

  return (
    <a className="NavBar__SignIn" href={"/auth/signin?origin_uri=" + location.href}>Sign In</a>
  )
}

NavBar.User = ({ user }: NavBarProps) => {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger as={NavBar.UserAvatar} user={user} />
      <DropdownMenu.Content className="DropdownMenu__Content">
        <DropdownMenu.Label className="DropdownMenu__Label">{user.username}</DropdownMenu.Label>
        <DropdownMenu.Item className="DropdownMenu__Item" onSelect={() => { }}>
          <div className="DropdownMenu__LeftSlot"><FontAwesomeIcon icon={faHome} /></div>
          <div className="DropdownMenu__CenterSlot">Home</div>
          <div className="DropdownMenu__RightSlot"></div>
        </DropdownMenu.Item>
        <DropdownMenu.Item className="DropdownMenu__Item" onSelect={() => { }}>
          <div className="DropdownMenu__LeftSlot"><FontAwesomeIcon icon={faUser} /></div>
          <div className="DropdownMenu__CenterSlot">Profile</div>
          <div className="DropdownMenu__RightSlot"></div>
        </DropdownMenu.Item>
        <DropdownMenu.Separator className="DropdownMenu__Separator" />
        <DropdownMenu.Label className="DropdownMenu__Label">Account</DropdownMenu.Label>
        <DropdownMenu.Item className="DropdownMenu__Item" onSelect={() => window.location.href = "/auth/signout?origin_uri=" + location.href}>
          <div className="DropdownMenu__LeftSlot"><FontAwesomeIcon icon={faSignOutAlt} /></div>
          <div className="DropdownMenu__CenterSlot">Sign Out</div>
          <div className="DropdownMenu__RightSlot"></div>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}

NavBar.UserAvatar = forwardRef<HTMLDivElement, NavBarProps>(({ user, ...props }, ref) => {
  return (
    <div className="NavBar__User" ref={ref} {...props}>
      <img alt="User avatar" src={user.avatarURL} className="NavBar__User--image" />
      <FontAwesomeIcon icon={faCaretDown} />
    </div>
  )
})